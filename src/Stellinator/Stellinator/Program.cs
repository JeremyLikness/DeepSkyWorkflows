// Copyright (c) Jeremy Likness. All rights reserved.
// Licensed under the MIT License. See LICENSE in the repository root for license information.

using System;
using CommandLine;
using CommandLine.Text;
using Stellinator.Configuration;
using Stellinator.FileSystem;
using Stellinator.Interfaces;
using Stellinator.Workflow;

namespace Stellinator
{
    /// <summary>
    /// Stellinator console app.
    /// </summary>
    public class Program
    {
        /// <summary>
        /// Main methodd and entry point.
        /// </summary>
        /// <param name="args">The list of arguments.</param>
        public static void Main(string[] args)
        {
            var parser = new Parser(with => with.HelpWriter = null);
            var result = parser.ParseArguments<Options>(args);
            result
                .WithParsed(ProcessFiles)
                .WithNotParsed(_ => ShowHelp(result));
        }

        /// <summary>
        /// Shows the help text.
        /// </summary>
        /// <param name="result">The result of parsing the arguments.</param>
        private static void ShowHelp(
            ParserResult<Options> result)
        {
            var helpText = HelpText.AutoBuild(
                result,
                h =>
            {
                h.AddEnumValuesToHelpText = true;
                return HelpText.DefaultParsingErrorsHandler(result, h);
            }, e => e);
            Console.WriteLine(helpText);
        }

        /// <summary>
        /// Process the files.
        /// </summary>
        /// <param name="options">The parsed options.</param>
        private static void ProcessFiles(Options options)
        {
            Console.WriteLine(options.ToString());
            IFileSystem fileSystem = new FileSystemHandler();
            IWorkflow parse = new ParseWorkflow(fileSystem);
            IWorkflow validation = new ValidateWorkflow(fileSystem);
            IWorkflow filterWorkflow = new FilterWorkflow();
            IWorkflow process = new ProcessWorkflow(filterWorkflow);
            IWorkflow target = new TargetWorkflow();
            IWorkflow mainworkflow = new MainWorkflow(
                parse,
                validation,
                process,
                target);
            try
            {
                var result = mainworkflow.Process(options, Array.Empty<AstroFile>());
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error encountered: {ex.Message}.");
            }

            return;
        }
    }
}
